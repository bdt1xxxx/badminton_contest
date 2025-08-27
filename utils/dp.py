from itertools import combinations


def solve_quadruple_selection(S4, n, r):
    """
    使用动态规划解决四元组选择问题，添加剪枝优化
    
    S4: 四元组列表
    n: S1中元素个数
    r: 每个元素的目标出现次数，用于剪枝
    
    返回: DP表，其中DP[i][state] = (min_j, prev_state, selected_quad)
    """
    m = len(S4)
    
    # 初始化DP表
    # DP[i][state] = (min_j, prev_state, selected_quad)
    # 其中state是长度为n的元组，表示每个元素的出现次数
    DP = {}
    
    # 初始状态：DP[0][(0,0,...,0)] = (0, None, None)
    initial_state = tuple([0] * n)
    DP[0] = {initial_state: (0, None, None)}
    
    # 动态规划主循环
    for i in range(1, m + 1):
        DP[i] = {}
        
        # 处理前i-1个四元组的所有状态
        if i-1 in DP:
            for prev_state, (prev_j, prev_prev_state, prev_selected) in DP[i-1].items():
                prev_state_list = list(prev_state)
                
                # 不选择第i个四元组
                if prev_state not in DP[i] or DP[i][prev_state][0] > prev_j:
                    DP[i][prev_state] = (prev_j, prev_state, None)
                
                # 选择第i个四元组
                new_state_list = prev_state_list.copy()
                for elem in S4[i-1]:  # S4[i-1]是第i个四元组
                    new_state_list[elem-1] += 1
                
                # 剪枝：如果任何元素出现次数超过r，跳过该状态
                if any(count > r for count in new_state_list):
                    continue
                
                new_state = tuple(new_state_list)
                new_j = prev_j + 1
                
                if new_state not in DP[i] or DP[i][new_state][0] > new_j:
                    DP[i][new_state] = (new_j, prev_state, i-1)
    
    return DP


def find_solutions(dp, n, S4, j, r):
    """
    找到满足条件的解
    
    dp: 动态规划结果表
    n: 元素个数
    S4: 四元组列表
    j: 目标四元组个数
    r: 每个元素的目标出现次数
    
    返回: 满足条件的解列表
    """
    solutions = []
    
    # 遍历所有状态，找到满足条件的解
    for i in dp:
        if i == 0:
            continue
            
        for state, (current_j, prev_state, selected_quad) in dp[i].items():
            # 检查是否满足条件：四元组个数为j，每个数字出现次数为r
            if current_j == j and all(count == r for count in state):
                # 回溯找到选中的四元组
                selected_quads = []
                current_state = state
                current_i = i
                
                while current_state != tuple([0] * n):
                    if current_i in dp and current_state in dp[current_i]:
                        _, prev_state, selected = dp[current_i][current_state]
                        if selected is not None:
                            selected_quads.append(selected)
                        current_state = prev_state
                        current_i -= 1
                    else:
                        break
                
                selected_quads.reverse()
                solutions.append(selected_quads)
    
    return solutions


def generate_all_quadruples(n):
    """生成n个元素的所有4元素组合"""
    S1 = list(range(1, n + 1))
    S4 = list(combinations(S1, 4))
    return S4


# 示例验证
def test_example():
    n = 8  # 改为6，更容易验证
    S4 = generate_all_quadruples(n)
    
    print(f"n = {n}")
    print(f"四元组数量: {len(S4)}")
    
    # 设置目标参数
    j = 20  # 目标四元组个数
    r = 10  # 每个数字的目标出现次数
    
    # 调用动态规划算法
    result = solve_quadruple_selection(S4, n, r)
    
    # 找到解
    solutions = find_solutions(result, n, S4, j, r)
    
    print(f"目标：j = {j}, r = {r}")
    print(f"即：选择{j}个四元组，每个数字出现{r}次")
    print()
    
    print("找到的解:")
    if solutions:
        # 去重：将解转换为集合来去除重复
        unique_solutions = []
        seen = set()
        for selection in solutions:
            selection_tuple = tuple(sorted(selection))
            if selection_tuple not in seen:
                seen.add(selection_tuple)
                unique_solutions.append(selection)
        
        print(f"总共找到 {len(solutions)} 个解，去重后有 {len(unique_solutions)} 个唯一解")
        print()
        
        for i, selection in enumerate(unique_solutions):
            selected_quads = [S4[idx] for idx in selection]
            print(f"  解{i+1}: 选择四元组 {selection}")
            print(f"        具体四元组: {selected_quads}")
            
            # 验证解的正确性
            state = [0] * n
            for quad in selected_quads:
                for elem in quad:
                    state[elem-1] += 1
            print(f"        验证状态: {state}")
            print()
    else:
        print("没有找到满足条件的解")


if __name__ == "__main__":
    test_example()